$(document).ready(function () {

    if (!window.location.href.includes('shein.com')) {
        return;
    }

    let popup = $('<div id="custom-popup"></div>');

    let border_color = '#FD384F';
    if (window.location.href.includes('shein.com')) {
        border_color = '#FD384F';
    }

    popup.css({
        'position': 'fixed',
        'bottom': '0',
        'right': '0',
        'width': '350px',
        'height': 'auto',
        'padding': '5px',
        'background-color': '#fff',
        'border': '6px solid ' + border_color,
        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'z-index': '1000',
        'overflow': 'auto',
        'text-align': 'center',
        'line-height': '2'
    });

    let popupContent = $('<div></div>').css({
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        'height': '100%',
        'line-height': '2'
    });

    let selectTemplate = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;"><label>选择模板(可选)：</label><select id="dynamic-template" style="border: 1px solid;width:150px; font-weight: bold; font-size: 16px;padding:2px 6px"></select></div>');
    let identityInfo = $('<div style="margin-top:10px; font-size: 14px; color: #666; text-align: center;"><i class="fas fa-info-circle"></i> 身份设置请在插件弹窗中配置</div>');
    if (window.location.href.includes('.shein.com') && !window.location.href.includes('.shein.com/s') && !window.location.href.includes('/b/')) { // 希音商品详情页面
        let buttonScrape = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;width:100%"><button id="dynamic-scrape" style="background-color: #18A058; color: white; padding: 5px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;">立即抓取</button><button id="dynamic-scrape" style="background-color: #F21461; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;margin-top:10px" disabled>抓取店铺</button></div>');
        popupContent.append(selectTemplate, identityInfo, buttonScrape);
    } else if (window.location.href.includes('.shein.com/s') || window.location.href.includes('/b/')) { // 希音列表页面
        let scrapeDiv = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;display:inline-block;"><button id="dynamic-scrape" style="background-color: #18A058; color: white; padding: 5px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;display:inline-block;">批量抓取</button><button id="auto-scrape" style="background-color: #FD384F; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:120px; font-weight: bold; font-size: 16px;display:inline-block;margin-left:10px;">自动抓取</button></div>');
        popupContent.append(selectTemplate, identityInfo, scrapeDiv);
    }

    popup.append(popupContent);
    $('body').append(popup);

    function get_template_list() {
        $.ajax({
            url: "http://127.0.0.1:8080/template/query",
            method: "GET",
            success: function (xhrData) {
                let options = xhrData.result.list;
                let selectElement = $('#dynamic-template');

                $.each(options, function (i, option) {
                    selectElement.append($('<option>', {
                        value: option.ID,
                        text: option.title
                    }));
                });

                chrome.storage.sync.get(['template'], function (result) {
                    if (result.template) {
                        selectElement.val(result.template);
                    }
                });
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error: " + status + error);
            }
        });
    }

    // 获取模板列表
    get_template_list();

    let selectedHrefs = [];

    // 类目列表页面
    $('.dcl-carousel-element').on('mouseenter', function () {
        let button = $('<button style="position: relative; top: 0; left: 0; background-color: #18A058; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 5px;">选择</button>');
        $(this).find('.dcl-product-wrapper').prepend(button);
        button.on('click', function (event) {
            event.stopPropagation();
            if (!$(this).hasClass('selected')) {
                let item_href = $(this).closest('.dcl-carousel-element').find('a.dcl-product-link').attr('href');
                $(this).closest('.dcl-carousel-element').addClass('selected').css('border', '4px solid green');
                selectedHrefs.push(item_href);
            } else {
                $(this).closest('.dcl-carousel-element').removeClass('selected').css('border', '');
                let item_href = $(this).closest('.dcl-carousel-element').find('a.dcl-product-link').attr('href');
                selectedHrefs = selectedHrefs.filter(href => href !== item_href);
            }
            // 判断select-mode是否选中，如果选中，则显示批量抓取按钮
            $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
        });
    })
        .on('mouseleave', function () {
            $(this).find('button').remove();
        });

    // 搜索列表页面
    $('.s-result-item').on('mouseenter', function () {
        let button = $('<button style="position: relative; top: 0; left: 0; background-color: #18A058; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 5px;">选择</button>');
        $(this).prepend(button);
        button.on('click', function (event) {
            event.stopPropagation();
            if (!$(this).hasClass('selected')) {
                let item_href = $(this).closest('.s-result-item').find('a').attr('href');
                $(this).closest('.s-result-item').addClass('selected').css('border', '4px solid green');
                selectedHrefs.push(item_href);
            } else {
                $(this).closest('.s-result-item').removeClass('selected').css('border', '');
                let item_href = $(this).closest('.s-result-item').find('a').attr('href');
                selectedHrefs = selectedHrefs.filter(href => href !== item_href);
            }
            // 判断select-mode是否选中，如果选中，则显示批量抓取按钮
            $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
        });
    }).on('mouseleave', function () {
        $(this).find('button').remove();
    });


    $('#dynamic-template').change(function () {
        let selectedTemplate = $(this).val();
        if (selectedTemplate) {
            chrome.storage.sync.set({ 'template': selectedTemplate }, function () {
                console.log('Template saved: ' + selectedTemplate);
            });
        }
    });



    // 列表页面自动翻页
    if (window.location.href.includes('aliexpress.com/w') && window.location.href.includes('open_mode=auto')) {
        do_scrape('auto');
    }

    // 获取所有分页urls并依次打开
    function auto_scrape_page() {
        let pageNumText = ''
        let pageNum = 0
        $("div.s-pagination-container").find(".s-pagination-item").each(function () {
            let text = $(this).text();
            if (text.includes('Next')) { // 下一页
                if (pageNumText) {
                    pageNum = parseInt(pageNumText);
                }
            }
            pageNumText = text.replace('Next', '').replace('Previous', '').trim();
        });
        console.log("抓取分页数================", pageNum);

        for (let i = 1; i <= pageNum; i++) {
            let urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', i);
            urlParams.set('ref', `sr_pg_${i - 1}`);
            urlParams.set('open_mode', 'auto');
            let autoUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
            setTimeout(() => {
                console.log("打开分页url================", autoUrl);
                window.open(autoUrl, '_blank');
            }, i * 10 * 1000);
        }
    }

    // 自动抓取每一页的商品
    function auto_scrape_list() {
        // 滚动到页面最底部
        let scrollHeight = document.body.scrollHeight * 3;
        let currentPosition = 0;
        let scrollStep = 200;
        let scrollInterval = setInterval(function () {
            if (currentPosition < scrollHeight) {
                currentPosition += scrollStep;
                window.scrollTo(0, currentPosition);
            } else {
                clearInterval(scrollInterval);
                let item_links = $('div[class*="s-product-image-container"]').find('a');
                console.log("当前页面可抓取商品数================", item_links.length);
                if (item_links.length > 0) {
                    item_links.each(function (index, ele) {
                        let href = $(ele).attr('href');
                        if (href) {
                            let autoUrl = href + '&open_mode=auto';
                            console.log("商品详情=autoUrl================", autoUrl);
                            setTimeout(() => {
                                window.open(autoUrl, '_blank');
                            }, index * 10000);
                        }
                    });
                }
            }
        }, 150);
    }

    // 执行手动选择并批量抓取
    function batch_selected_scrape() {
        if (selectedHrefs.length == 0) {
            alert('请选择商品.');
            return;
        }

        selectedHrefs.forEach((href, index) => {
            let autoUrl = href + '&open_mode=auto';
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, index * 10000);
        });
        // 清空
        selectedHrefs = [];
        // 批量抓取按钮内容重置
        $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
    }

    // 执行具体抓取
    function do_scrape() {
        let selectedTemplate = $('#dynamic-template').val();

        // 从chrome.storage中获取身份设置
        chrome.storage.sync.get(['scrapeKey'], function (result) {
            let selectedIdentity = result.scrapeKey;

            if (!selectedIdentity) {
                alert('请在插件弹窗中设置身份标识');
                return;
            }

            performScrape(selectedTemplate, selectedIdentity);
        });
    }

    // 执行实际的抓取操作
    function performScrape(selectedTemplate, selectedIdentity) {

        let product_info = {};

        let product_title = $("h1[class*='product-intro__head-name']").text()
        // 获取售价
        let sell_price_text = $("div[class*='original']").text();
        // 剔除sell_price_text中美元符号或者人民币符号以及空格字符
        let sell_price = sell_price_text.replace('$', '').replace('￥', '').replace(' ', '');
        if (sell_price.includes('$')) {
            sell_price = sell_price.split('$')[1];
        }

        product_info['product_title'] = product_title.trim();
        product_info['sell_price'] = sell_price;
        product_info['origin_price'] = sell_price;

        // 获取尺码
        let sizeOptions = [];
        $("span[class*='j-product-intro__size-radio-spopover']").each(function () {
            sizeOptions.push($(this).text());
        });
        product_info['size_props'] = sizeOptions;

        // 获取颜色
        product_info['color_props'] = { 'oneColor': '' };

        // 获取颜色以及图片
        // let colorImagesArr = [];
        // $('div[class*="product-intro__thumbs-item"]').each(function () {
        //     let color_image = $(this).find('img').first().attr('src');
        //     colorImagesArr.push(color_image);
        // });
        // product_info['color_images'] = { color_name: 'oneColor', other_images: colorImagesArr };

        // 获取商品规格
        $('script').each(function () {
            let scriptContent = $(this).html();
            let start_split = `window.gbRawData =`;
            let end_split = `document.dispatchEvent(new Event("SRenderInitialPropsLoaded"));`;
            if (scriptContent.includes(`window.gbRawData =`)) {
                let colorJsonTxt = scriptContent.substring(scriptContent.indexOf(start_split) + start_split.length, scriptContent.indexOf(end_split));
                let colorJson = JSON.parse(colorJsonTxt);
                // 商品属性规格
                let product_specs = colorJson.productIntroData.detail.productDetails;
                let product_specifications = [];
                if (product_specs.length > 0) {
                    product_specs.forEach(function (product_spec) {
                        let _title = product_spec.attr_name;
                        let _value = product_spec.attr_value;
                        product_specifications.push({
                            title: _title,
                            value: _value
                        });
                    });
                }
                product_info['spec_props'] = product_specifications;

                // 尺码表
                let size_infos = colorJson.productIntroData.sizeInfoDes.sizeInfo

                let size_info_inchs = colorJson.productIntroData.sizeInfoDes.sizeInfoInch;

                let measure_model_image = colorJson.productIntroData.sizeInfoDes.basicAttribute.image_url;

                let measure_infos = colorJson.productIntroData.sizeInfoDes.basicAttribute.attribute_info;

                // 商品主图与other图片
                let other_images = colorJson.productIntroData.goods_imgs.detail_image;
                if (other_images && other_images.length > 0) {
                    let main_image_url = colorJson.productIntroData.goods_imgs.main_image.origin_image
                    let colorImagesArr = [];
                    other_images.forEach(function (image) {
                        colorImagesArr.push(image.origin_image);
                    });
                    product_info['color_images'] = { color_name: 'oneColor', main_image: main_image_url, other_images: colorImagesArr };
                }
            }
        });

        // 商品描述
        let product_descs = [];
        product_info['product_desc'] = product_descs;

        let send_json = {
            'template': selectedTemplate,
            'scrapeKey': selectedIdentity,
            'item_url': window.location.href,
            'product_info': product_info
        };

        fetch('http://127.0.0.1:8012/save_init_product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(send_json)
        }).then(response => response.json())
            .then(data => {
                // 判断如果当前url包含open_mode=auto，则不弹出抓取成功
                if (!window.location.href.includes('open_mode=auto')) {
                    alert("抓取成功");
                }
            })
            .catch(error => {
                if (!window.location.href.includes('open_mode=auto')) {
                    alert("抓取失败");
                }
            });

    }

    // performScrape函数结束

    // 手动执行抓取操作以及批量操作
    $('#dynamic-scrape').click(function () {
        let c_url = window.location.href;
        // 定义正则表达式，匹配 - 后面跟着 8 个数字，然后是 .html 
        const regex = /-\d{8}\.html/;
        // 使用正则表达式测试输入字符串
        if (regex.test(c_url)) {  // 商品详情页面抓取
            do_scrape();  // 商品详情页面，手动抓取单个商品
        } else {
            batch_selected_scrape();
        }
    });

    // 自动抓取，点击自动抓取按钮
    $('#auto-scrape').click(function () {
        auto_scrape_page();
    });

    // 自动抓取亚马逊详情页面数据，并再延迟10s，直接执行抓取动作
    if (window.location.href.includes('/dp/') && window.location.href.includes('shein.com') && window.location.href.includes('open_mode=auto')) {
        setTimeout(function () {
            do_scrape();
            setTimeout(function () {
                window.close();
            }, 5 * 1000);
        }, 10 * 1000);
    }

    // 自动抓取列表页面数据
    if (window.location.href.includes('shein.com/s') && window.location.href.includes('open_mode=auto')) {
        setTimeout(function () {
            auto_scrape_list();
            setTimeout(function () {
                window.close();
            }, 10000 * 6 * 10);
        }, 10000);
    }

});
